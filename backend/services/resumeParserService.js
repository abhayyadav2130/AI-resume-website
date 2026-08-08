import path from 'node:path';
import pdf from 'pdf-parse';
import AppError from '../utils/AppError.js';

const headings = ['summary', 'professional summary', 'experience', 'work experience', 'skills', 'education', 'projects', 'certifications', 'certificates', 'achievements', 'languages', 'contact'];

export async function extractResumeText(buffer, originalName) {
  const extension = path.extname(originalName).toLowerCase();
  if (extension === '.pdf') {
    if (buffer.subarray(0, 4).toString() !== '%PDF') throw new AppError('The uploaded file is not a valid PDF.', 415);
    return { text: (await pdf(buffer)).text, sourceFormat: 'pdf' };
  }
  if (extension === '.docx') {
    let mammoth;
    try { mammoth = (await import('mammoth')).default; } catch { throw new AppError('DOCX support is not installed. Run npm.cmd install in the backend folder.', 503); }
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, sourceFormat: 'docx' };
  }
  throw new AppError('Only PDF and DOCX resumes are accepted.', 415);
}

export function buildSections(text) {
  const lines = text.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const sections = [];
  let current = { id: 'overview', title: 'Overview', content: [], order: 0 };
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/:$/, '');
    if (headings.includes(normalized) || (line.length < 40 && headings.some((heading) => normalized.includes(heading)))) {
      if (current.content.length) sections.push({ ...current, content: current.content.join('\n') });
      current = { id: normalized.replace(/[^a-z0-9]+/g, '-'), title: line.replace(/:$/, ''), content: [], order: sections.length };
    } else current.content.push(line);
  }
  if (current.content.length) sections.push({ ...current, content: current.content.join('\n') });
  return sections.length ? sections : [{ id: 'resume', title: 'Resume', content: text, order: 0 }];
}

export function sectionsToText(sections) {
  return sections.sort((a, b) => a.order - b.order).map((section) => `${section.title}\n${section.content}`).join('\n\n');
}
