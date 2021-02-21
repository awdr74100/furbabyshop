import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
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
    accounts: [
      {
        _id: false,
        kind: {
          type: String,
          required: true,
        },
        uid: {
          type: String,
        },
        displayName: {
          type: String,
        },
        photo: {
          type: String,
          required: true,
        },
        username: {
          type: String,
          unique: true,
        },
        password: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true },
);

userSchema.plugin(uniqueValidator);

export default mongoose.model('User', userSchema);
