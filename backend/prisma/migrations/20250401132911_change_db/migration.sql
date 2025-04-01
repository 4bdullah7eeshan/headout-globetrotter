/*
  Warnings:

  - Added the required column `userSubmittedTime` to the `Round` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userSubmittedTime" TIMESTAMP(3) NOT NULL;
