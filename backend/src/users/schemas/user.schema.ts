import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: Role, default: Role.Player })
  role: Role;

  @Prop({ type: String, enum: ['active', 'inactive'], default: 'inactive' })
  status: string;

  @Prop({ default: null })
  profilePicture: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
