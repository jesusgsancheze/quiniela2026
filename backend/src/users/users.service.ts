import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(data: Partial<User>): Promise<User> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findAllPlayers(): Promise<User[]> {
    return this.userModel
      .find({}, { password: 0 })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(
    userId: string,
    status: 'active' | 'inactive',
  ): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { status }, { new: true })
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; email?: string },
  ): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, data, { new: true })
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });
  }

  async updateProfilePicture(
    userId: string,
    filename: string,
  ): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { profilePicture: filename },
        { new: true },
      )
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
