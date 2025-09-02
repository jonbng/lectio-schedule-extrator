"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface Lesson {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  startTime: string;
}

interface Schedule {
  lessons: Lesson[];
}

export default function Home() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [gymId, setGymId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    if (gymId && sessionToken) {
      fetch("https://lectio.jonathanb.dk/api?gymId=" + gymId, {
        headers: {
          // "Authorization": "Bearer " + sessionToken,
          // "x-lectio-cookie": sessionToken ?? "",
          "x-lectio-session": sessionToken,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            console.error(data.error);
            setIsLoading(false);
            return;
          }
          setSchedule(data);
          setIsLoading(false);
        });
    }
  }, [gymId, sessionToken]);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-xl font-extrabold flex flex-row gap-2 items-center">
          <span>Lectio Next</span>
          <div className="flex flex-row gap-2 items-center">
            <input
              type="text"
              placeholder="Session Token"
              value={sessionToken || ""}
              onChange={(e) => setSessionToken(e.target.value)}
            />
            <input
              type="text"
              placeholder="Gym ID"
              value={gymId || ""}
              onChange={(e) => setGymId(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : (
          <div className="text-gray-500">
            {schedule?.lessons.map((lesson) => (
              <div key={lesson.id}>{lesson.subject}</div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
