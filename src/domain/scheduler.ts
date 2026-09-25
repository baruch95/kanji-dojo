/** Serializable envelope for one pinned FSRS card. */
export type StoredCard = Readonly<{
  engine: 'ts-fsrs'
  libraryVersion: string
  configId: string
  card: Readonly<{ due: number; stability: number; difficulty: number; elapsed_days: number; scheduled_days: number; learning_steps: number; reps: number; lapses: number; state: number; last_review?: number }>
}>
export type StoredLog = Readonly<{ rating: number; state: number; due: number; stability: number; difficulty: number; elapsed_days: number; last_elapsed_days: number; scheduled_days: number; learning_steps: number; review: number }>
