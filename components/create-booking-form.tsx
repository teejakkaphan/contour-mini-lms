"use client";

import { SubmitEvent, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function CreateBookingForm() {
  const [dateTime, setDateTime] = useState<number>();

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
  };
  return (
    <form
      className="flex flex-col gap-2 col-span-full md:col-start-2 md:col-span-3"
      onSubmit={handleSubmit}
    >
      <Input
        type="datetime-local"
        onChange={(e) => setDateTime(new Date(e.target.value).getTime())}
      />
      <Button type="submit" disabled={!dateTime}>
        Book
      </Button>
    </form>
  );
}
