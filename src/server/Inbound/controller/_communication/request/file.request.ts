import z from "zod";

export const renameFileSchema = z.object({
    filename: z.string().min(1),
});

export const fileIdParamsSchema = z.object({
    fileId: z.uuid(),
});

export const fileAndNoteParamsSchema = z.object({
    fileId: z.uuid(),
    noteId: z.uuid(),
});
