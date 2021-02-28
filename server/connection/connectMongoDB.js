import mongoose from 'mongoose';

export default async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    console.log(`🔥 MongoDB connected to ${process.env.MONGODB_URL}`);
  } catch (error) {
    console.log(error);
  }
};
