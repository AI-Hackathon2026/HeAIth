export function toPlanProgress(progressPercentage: number): {
    isCompleted: boolean;
    progressionBar: number;
} {
    const progressionBar = Math.min(100, Math.max(0, progressPercentage));
    return {
        isCompleted: progressionBar >= 100,
        progressionBar,
    };
}

export function resolveProgressPercentage(input: {
    progressionBar?: number;
    isCompleted?: boolean;
}): number {
    if (input.progressionBar !== undefined) {
        return Math.min(100, Math.max(0, input.progressionBar));
    }
    if (input.isCompleted !== undefined) {
        return input.isCompleted ? 100 : 0;
    }
    throw new Error("progressionBar or isCompleted is required");
}
