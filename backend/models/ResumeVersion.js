import mongoose from 'mongoose';

const resumeVersionSchema = new mongoose.Schema({
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  version: { type: Number, required: true },
  label: { type: String, trim: true, maxlength: 100, default: 'Manual edit' },
  sections: { type: Array, default: [] },
  rawText: { type: String, required: true }
}, { timestamps: true, versionKey: false });

resumeVersionSchema.index({ resume: 1, version: -1 }, { unique: true });
export default mongoose.model('ResumeVersion', resumeVersionSchema);
