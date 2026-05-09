import { model, models, Schema, type InferSchemaType } from "mongoose";

const itemSchema = new Schema(
  {
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
    _id: true,
    timestamps: true,
  },
);

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    scope: {
      type: String,
      enum: ["personal", "shared"],
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    connectionKey: {
      type: String,
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastEditedByName: {
      type: String,
      default: null,
    },
    lastEditedByEmail: {
      type: String,
      default: null,
    },
    items: {
      type: [itemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.index({ scope: 1, ownerId: 1 });
categorySchema.index({ scope: 1, connectionKey: 1 });

export type CategoryRecord = InferSchemaType<typeof categorySchema> & {
  _id: { toString(): string };
};

const Category = models.Category || model("Category", categorySchema);

export default Category;
