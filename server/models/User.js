import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const userSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      default: '',
    },
    username: {
      type: String,
      required: true,
      unique: true,
      minLength: 6,
      maxLength: 14,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    draws: {
      type: Number,
      min: 0,
      default: 0,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    tokenVersion: {
      type: Number,
      min: 0,
      default: 0,
    },
    providers: {
      type: Array,
      default: ['custom'],
    },
  },
  { timestamps: true },
);

userSchema.plugin(uniqueValidator);

export default mongoose.model('User', userSchema);
