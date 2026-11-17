import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const assistantSchema = new mongoose.Schema(
  {
    assistantId: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    title: { type: String, trim: true },
    company: { type: String, trim: true },
    // The ID the owner types in the "Who is working?" popup
    actorId: { type: String, default: 'OWN-001', uppercase: true, trim: true },
    // Assistants have no login, only an ID and a name
    assistants: [assistantSchema],
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    title: this.title,
    company: this.company,
    actorId: this.actorId,
    assistants: this.assistants,
  };
};

export default mongoose.model('User', userSchema);