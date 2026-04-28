import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function trackEvent(
  userId: string,
  eventName: string,
  metadata?: Prisma.JsonObject,
) {
  await prisma.analyticsEvent.create({
    data: {
      userId,
      eventName,
      metadata,
    },
  });
}
