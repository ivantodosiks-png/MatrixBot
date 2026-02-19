import { countSuccessfulChats, countUsers, getResponsesPerSecond } from "@/lib/user-store";

export type PublicStats = {
  usersCount: number;
  successfulChatsCount: number;
  responsesPerSecond: number;
};

export async function getPublicStats(sampleSize = 120): Promise<PublicStats> {
  const [usersCount, successfulChatsCount, responsesPerSecond] = await Promise.all([
    countUsers(),
    countSuccessfulChats(),
    getResponsesPerSecond(sampleSize),
  ]);

  return {
    usersCount,
    successfulChatsCount,
    responsesPerSecond,
  };
}
