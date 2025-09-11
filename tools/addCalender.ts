import { google } from "googleapis";
import { authorize } from "../utils/auth";

export const addCalendarEventTool = {
  type: "function",
  function: {
    name: "add_calendar_event",
    description: "Googleカレンダーに予定を追加する",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "予定タイトル" },
        start: { type: "string", description: "ISO8601 with offset" },
        end: { type: "string", description: "ISO8601 with offset" },
      },
      required: ["summary", "start", "end"],
    },
  },
};

export async function addCalendarEvent(args: {
  summary: string;
  start: string;
  end: string;
}) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: args.summary,
      start: { dateTime: args.start },
      end: { dateTime: args.end },
    },
  });

  return `${args.start}〜${args.end}に${res.data.summary}をカレンダー追加しました`;
}
