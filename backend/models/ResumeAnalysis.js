import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', index: true },
  resumeName: { type: String, required: true, trim: true },
  jobTitle: { type: String, trim: true, maxlength: 150, default: '' },
  company: { type: String, trim: true, maxlength: 150, default: '' },
  jobDescription: { type: String, required: true, maxlength: 30000 },
  atsScore: { type: Number, required: true, min: 0, max: 100 },
  matchPercentage: { type: Number, required: true, min: 0, max: 100 },
  missingKeywords: [String], matchedKeywords: [String], technicalSkills: [String], softSkills: [String],
  grammarIssues: [String], formatSuggestions: [String], strongSections: [String], weakSections: [String], improvements: [String],
  summary: { type: String, required: true },
  overallRating: { type: String, enum: ['Excellent', 'Good', 'Average', 'Poor'], required: true }
  ,
  atsBreakdown: { type: [mongoose.Schema.Types.Mixed], default: [] },
  recruiterReport: { type: mongoose.Schema.Types.Mixed, default: {} },
  hiringPrediction: { type: mongoose.Schema.Types.Mixed, default: {} },
  sectionAnalysis: { type: [mongoose.Schema.Types.Mixed], default: [] },
  improvementCenter: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true, versionKey: false });

analysisSchema.index({ user: 1, createdAt: -1 });
export default mongoose.model('ResumeAnalysis', analysisSchema);
