export type AvailabilitySlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
};

export type AvailabilityResponse = {
  slots: AvailabilitySlot[];
};

export function slotDate(slot: AvailabilitySlot): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: slot.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(slot.startsAt));
}
export function slotTime(slot: AvailabilitySlot): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: slot.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(slot.startsAt));
}
