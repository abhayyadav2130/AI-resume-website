import fs from 'node:fs/promises';
import { body, param } from 'express-validator';
import Resume from '../models/Resume.js';
import ResumeUpload from '../models/ResumeUpload.js';
import ResumeVersion from '../models/ResumeVersion.js';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import AppError from '../utils/AppError.js';
import { analyzeResume, improveResumeSection, rewriteResume } from '../services/geminiService.js';
import { buildSections, extractResumeText, sectionsToText } from '../services/resumeParserService.js';
import { calculateAtsBaseline } from '../services/atsEngine.js';

export const analyzeValidation = [body('uploadId').isMongoId(), body('jobDescription').trim().isLength({ min: 40, max: 30000 }), body('jobTitle').optional().trim().isLength({ max: 150 }), body('company').optional().trim().isLength({ max: 150 })];
export const idValidation = [param('id').isMongoId()];
export const editorValidation = [body('resumeId').isMongoId(), body('sections').isArray({ min: 1, max: 25 }), body('sections.*.id').trim().isLength({ min: 1, max: 100 }), body('sections.*.title').trim().isLength({ min: 1, max: 100 }), body('sections.*.content').isString().isLength({ max: 20000 }), body('sections.*.order').isInt({ min: 0, max: 50 })];
export const improveValidation = [body('resumeId').isMongoId(), body('sectionId').trim().isLength({ min: 1, max: 100 }), body('jobDescription').optional().trim().isLength({ max: 30000 })];
export const rewriteValidation = [body('resumeId').isMongoId(), body('jobDescription').trim().isLength({ min: 40, max: 30000 }), body('target').isIn(['ats', 'recruiter', 'faang', 'startup', 'senior-developer', 'intern'])];
const emit = (req, event, payload) => req.app.get('io')?.to(`user:${req.user.id}`).emit(event, payload);

export async function uploadResume(req, res, next) {
  if (!req.file) return next(new AppError('A PDF or DOCX resume is required.', 400));
  try {
    const { text, sourceFormat } = await extractResumeText(await fs.readFile(req.file.path), req.file.originalname);
    const resumeText = text.replace(/\s+/g, ' ').trim();
    if (resumeText.length < 50) throw new AppError('This file contains too little readable text. Upload a text-based PDF or DOCX.', 422);
    const sections = buildSections(text);
    const resume = await Resume.create({ user: req.user.id, name: req.file.originalname, sourceFormat, rawText: resumeText, sections, completion: Math.min(100, sections.length * 16) });
    await ResumeVersion.create({ resume: resume.id, user: req.user.id, version: 1, label: 'Original upload', sections, rawText: resumeText });
    const upload = await ResumeUpload.create({ user: req.user.id, resume: resume.id, resumeName: resume.name, resumeText, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    res.status(201).json({ success: true, upload: { id: upload.id, resumeId: resume.id, resumeName: upload.resumeName, expiresAt: upload.expiresAt }, resume: { id: resume.id, name: resume.name, sections, completion: resume.completion, version: 1 } });
  } catch (error) { next(error); } finally { await fs.unlink(req.file.path).catch(() => {}); }
}

export async function analyze(req, res, next) {
  try {
    const upload = await ResumeUpload.findOne({ _id: req.body.uploadId, user: req.user.id });
    if (!upload) throw new AppError('Resume upload not found or expired. Please upload it again.', 404);
    const resume = await Resume.findOne({ _id: upload.resume, user: req.user.id }).select('+rawText');
    if (!resume) throw new AppError('Resume not found.', 404);
    const baseline = calculateAtsBaseline(resume.rawText, req.body.jobDescription, resume.sections);
    const aiResult = await analyzeResume({ resumeText: resume.rawText, jobDescription: req.body.jobDescription, jobTitle: req.body.jobTitle, company: req.body.company });
    const analysis = await ResumeAnalysis.create({ user: req.user.id, resume: resume.id, resumeName: resume.name, jobDescription: req.body.jobDescription, jobTitle: req.body.jobTitle || '', company: req.body.company || '', ...aiResult, atsScore: Math.round(aiResult.atsScore * 0.7 + baseline.score * 0.3), matchPercentage: Math.round(aiResult.matchPercentage * 0.7 + baseline.matchPercentage * 0.3), matchedKeywords: [...new Set([...baseline.matchedKeywords, ...aiResult.matchedKeywords])], missingKeywords: [...new Set([...baseline.missingKeywords, ...aiResult.missingKeywords])], atsBreakdown: baseline.atsBreakdown });
    resume.lastAnalyzedAt = new Date(); await resume.save(); await ResumeUpload.deleteOne({ _id: upload.id });
    emit(req, 'analysis:complete', { resumeId: resume.id, analysisId: analysis.id, atsScore: analysis.atsScore });
    res.status(201).json({ success: true, analysis });
  } catch (error) { next(error); }
}

export async function saveEditor(req, res, next) {
  try {
    const resume = await Resume.findOne({ _id: req.body.resumeId, user: req.user.id }).select('+rawText');
    if (!resume) throw new AppError('Resume not found.', 404);
    const sections = req.body.sections.sort((a, b) => a.order - b.order);
    resume.sections = sections; resume.rawText = sectionsToText(sections); resume.version += 1; resume.completion = Math.min(100, sections.length * 16); await resume.save();
    await ResumeVersion.create({ resume: resume.id, user: req.user.id, version: resume.version, label: req.body.label || 'Editor autosave', sections, rawText: resume.rawText });
    emit(req, 'resume:saved', { resumeId: resume.id, version: resume.version, completion: resume.completion });
    res.json({ success: true, resume: { id: resume.id, name: resume.name, sections: resume.sections, version: resume.version, completion: resume.completion } });
  } catch (error) { next(error); }
}

export async function improveSection(req, res, next) {
  try {
    const resume = await Resume.findOne({ _id: req.body.resumeId, user: req.user.id });
    const section = resume?.sections.find((item) => item.id === req.body.sectionId);
    if (!section) throw new AppError('Resume section not found.', 404);
    res.json({ success: true, sectionId: section.id, ...(await improveResumeSection({ title: section.title, content: section.content, jobDescription: req.body.jobDescription })) });
  } catch (error) { next(error); }
}

export async function rewrite(req, res, next) {
  try {
    const resume = await Resume.findOne({ _id: req.body.resumeId, user: req.user.id }).select('+rawText');
    if (!resume) throw new AppError('Resume not found.', 404);
    res.json({ success: true, target: req.body.target, ...(await rewriteResume({ resumeText: resume.rawText, jobDescription: req.body.jobDescription, target: req.body.target })) });
  } catch (error) { next(error); }
}

export async function history(req, res, next) { try { const analyses = await ResumeAnalysis.find({ user: req.user.id }).sort({ createdAt: -1 }).select('-jobDescription'); res.json({ success: true, analyses }); } catch (error) { next(error); } }
export async function getResume(req, res, next) { try { const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id }); if (!resume) throw new AppError('Resume not found.', 404); const versions = await ResumeVersion.find({ resume: resume.id }).sort({ version: -1 }).select('-rawText'); res.json({ success: true, resume, versions }); } catch (error) { next(error); } }
export async function deleteAnalysis(req, res, next) { try { const deleted = await ResumeAnalysis.findOneAndDelete({ _id: req.params.id, user: req.user.id }); if (!deleted) throw new AppError('Analysis not found.', 404); res.status(204).send(); } catch (error) { next(error); } }
