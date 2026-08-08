import multer from 'multer';
import path from 'path';
import AppError from '../utils/AppError.js';

const storage = multer.diskStorage({
  destination: path.resolve('uploads'),
  filename: (req, file, callback) => callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const accepted = (extension === '.pdf' && file.mimetype === 'application/pdf') || (extension === '.docx' && file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    if (!accepted) return callback(new AppError('Only PDF and DOCX files are accepted.', 415));
    callback(null, true);
  }
});
export default upload;
