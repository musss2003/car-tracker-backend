import mongoose, { Schema, Document } from 'mongoose';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  CONVERTED = 'converted',
  EXPIRED = 'expired'
}

export enum BookingExtraType {
  GPS = 'gps',
  CHILD_SEAT = 'child_seat',
  ADDITIONAL_DRIVER = 'additional_driver',
  INSURANCE_UPGRADE = 'insurance_upgrade',
  WIFI = 'wifi',
  ROOF_RACK = 'roof_rack'
}

export interface IBookingExtra {
  type: BookingExtraType;
  quantity: number;
  pricePerDay: number;
}

export interface IBooking extends Document {
  customerId: mongoose.Types.ObjectId;
  carId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  totalEstimatedCost: number;
  depositAmount: number;
  depositPaid: boolean;
  notes?: string;
  bookingReference: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  additionalDrivers?: string[];
  extras?: IBookingExtra[];
  cancelledAt?: Date;
  cancellationReason?: string;
  convertedToContractId?: mongoose.Types.ObjectId;
  convertedAt?: Date;
  expiresAt: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BookingExtraSchema = new Schema<IBookingExtra>(
  {
    type: {
      type: String,
      enum: Object.values(BookingExtraType),
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const BookingSchema = new Schema<IBooking>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    carId: {
      type: Schema.Types.ObjectId,
      ref: 'Car',
      required: true,
      index: true
    },
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      index: true
    },
    totalEstimatedCost: {
      type: Number,
      required: true,
      min: 0
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    depositPaid: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true
    },
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    pickupLocation: {
      type: String,
      trim: true
    },
    dropoffLocation: {
      type: String,
      trim: true
    },
    additionalDrivers: [
      {
        type: String,
        trim: true
      }
    ],
    extras: [BookingExtraSchema],
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      trim: true
    },
    convertedToContractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract'
    },
    convertedAt: {
      type: Date
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for common queries
BookingSchema.index({ carId: 1, startDate: 1, endDate: 1 });
BookingSchema.index({ customerId: 1, status: 1 });
BookingSchema.index({ status: 1, expiresAt: 1 });
BookingSchema.index({ startDate: 1, status: 1 });

// Virtual for number of days
BookingSchema.virtual('numberOfDays').get(function () {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Ensure virtuals are included in JSON
BookingSchema.set('toJSON', { virtuals: true });
BookingSchema.set('toObject', { virtuals: true });

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);