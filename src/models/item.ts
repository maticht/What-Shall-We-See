import mongoose, { model, models, Schema, type InferSchemaType } from "mongoose";

const ITEM_STATUS_VALUES = ["planned", "in_progress", "done", "dropped"] as const;

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
      enum: ITEM_STATUS_VALUES,
      default: "planned",
    },
    imageUrl: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    sourceUrl: {
      type: String,
      default: null,
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

const existingItemModel = models.Item;
let Item = existingItemModel;

if (existingItemModel) {
  const statusPath = existingItemModel.schema.path("status") as
    | {
        enumValues?: string[];
      }
    | undefined;

  const enumValues = statusPath?.enumValues ?? [];
  const hasAllStatusValues = ITEM_STATUS_VALUES.every((value) =>
    enumValues.includes(value),
  );

  if (!hasAllStatusValues) {
    // Hot-reload can keep a stale enum validator in memory, so rebuild model fully.
    mongoose.deleteModel("Item");
    Item = model("Item", itemSchema);
  }
}

if (!Item) {
  Item = model("Item", itemSchema);
}

export default Item;
