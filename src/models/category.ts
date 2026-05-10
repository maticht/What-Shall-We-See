import { model, models, Schema, type InferSchemaType } from "mongoose";

const GLOBAL_TYPE_DEFINITION = {
  type: String,
  enum: ["movie", "game", "anime", "book", "other"],
  default: "other",
  required: true,
  index: true,
} as const;

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    emoji: {
      type: String,
      default: "📁",
      trim: true,
    },
    scope: {
      type: String,
      enum: ["personal", "shared"],
      required: true,
    },
    globalType: GLOBAL_TYPE_DEFINITION,
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

const existingCategoryModel = models.Category;

if (existingCategoryModel && !existingCategoryModel.schema.path("globalType")) {
  existingCategoryModel.schema.add({
    globalType: GLOBAL_TYPE_DEFINITION,
  });
  existingCategoryModel.recompileSchema?.();
}

const Category = existingCategoryModel || model("Category", categorySchema);

export default Category;
