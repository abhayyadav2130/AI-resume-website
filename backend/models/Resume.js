import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  content: { type: String, default: '', maxlength: 20000 },
  order: { type: Number, required: true }
}, { _id: false });

const resumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 255 },
  sourceFormat: { type: String, enum: ['pdf', 'docx'], required: true },
  rawText: { type: String, required: true, select: false },
  sections: { type: [sectionSchema], default: [] },
  completion: { type: Number, min: 0, max: 100, default: 0 },
  version: { type: Number, min: 1, default: 1 },
  lastAnalyzedAt: Date
}, { timestamps: true, versionKey: false });

resumeSchema.index({ user: 1, updatedAt: -1 });
export default mongoose.model('Resume', resumeSchema);
