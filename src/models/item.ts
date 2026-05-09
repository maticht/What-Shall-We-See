import { model, models, Schema, type InferSchemaType } from "mongoose";

const ratingEntrySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    updatedByName: {
      type: String,
      default: null,
    },
    updatedByEmail: {
      type: String,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const itemSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["planned", "in_progress", "done"],
      default: "planned",
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      default: null,
    },
    ratings: {
      type: [ratingEntrySchema],
      default: [],
    },
    updatedByName: {
      type: String,
      default: null,
    },
    updatedByEmail: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

itemSchema.index({ categoryId: 1, updatedAt: -1 });

export type ItemRecord = InferSchemaType<typeof itemSchema> & {
  _id: { toString(): string };
  categoryId: { toString(): string };
};

const Item = models.Item || model("Item", itemSchema);

export default Item;
