import mongoose from 'mongoose';

const resumeUploadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
  resumeName: { type: String, required: true, trim: true, maxlength: 255 },
  resumeText: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true, versionKey: false });

export default mongoose.model('ResumeUpload', resumeUploadSchema);
