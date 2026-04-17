-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'PHOTO');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "buttons" JSONB,
ADD COLUMN     "disableWebPagePreview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "MessageKind" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "mediaUrl" TEXT;

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "buttons" JSONB,
ADD COLUMN     "disableWebPagePreview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "MessageKind" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "mediaUrl" TEXT;

