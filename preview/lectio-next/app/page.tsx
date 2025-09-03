"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LectioScheduleResponse,
  WeekSchedule,
  ScheduleItem,
  DaySchedule,
} from "../../../types/lectio";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  BookOpen,
  GraduationCap,
  Hash,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

// Rate limiting and localStorage utilities
const RATE_LIMIT_INTERVAL = 5000; // 5 seconds between API calls
const STORAGE_KEYS = {
  SESSION_TOKEN: "lectio_session_token",
  GYM_ID: "lectio_gym_id",
  LAST_FETCH: "lectio_last_fetch",
};

// Helper Components
const StatusBadge = ({ status }: { status: ScheduleItem["status"] }) => {
  if (status === "normal") return null;

  const variants = {
    changed: { icon: AlertTriangle, text: "Changed" },
    cancelled: { icon: X, text: "Cancelled" },
  };

  const variant = variants[status as keyof typeof variants];
  if (!variant) return null;

  const Icon = variant.icon;

  return (
    <Badge variant="outline" className="text-xs">
      <Icon className="w-3 h-3 mr-1" />
      {variant.text}
    </Badge>
  );
};

const ScheduleItemCard = ({ item }: { item: ScheduleItem }) => {
  return (
    <Card className="border-l-2 border-l-gray-900 hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{item.subject.name}</h4>
              <StatusBadge status={item.status} />
            </div>
            {item.subject.code !== item.subject.name && (
              <p className="text-sm text-muted-foreground">
                {item.subject.code}
              </p>
            )}
          </div>
          <div className="text-right text-sm">
            <div className="flex items-center justify-end font-medium mb-1">
              <Clock className="w-3 h-3 mr-1" />
              {item.startTime} - {item.endTime}
            </div>
            <span className="text-xs text-muted-foreground">
              Module {item.module}
            </span>
          </div>
        </div>

        <div className="flex items-center text-sm text-muted-foreground mb-3 gap-4">
          {item.teacher.name && (
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              <span>{item.teacher.initials}</span>
            </div>
          )}
          {item.room.name && (
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              <span>{item.room.name}</span>
            </div>
          )}
        </div>

        {item.topic && (
          <div className="mb-3">
            <p className="text-sm bg-gray-50 p-2 rounded">{item.topic}</p>
          </div>
        )}

        {item.homework && item.homework.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center mb-2">
              <BookOpen className="w-3 h-3 mr-2" />
              <span className="text-sm font-medium">
                Homework ({item.homework.length})
              </span>
            </div>
            <ul className="space-y-1">
              {item.homework.map((hw, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground pl-4 border-l border-gray-200"
                >
                  {hw.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">
          Loading schedule...
        </span>
      </div>
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// localStorage utilities
const getStoredValue = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStoredValue = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage errors
  }
};

// Rate limiting utilities
const canFetch = (): boolean => {
  const lastFetch = getStoredValue(STORAGE_KEYS.LAST_FETCH);
  if (!lastFetch) return true;

  const timeSinceLastFetch = Date.now() - parseInt(lastFetch);
  return timeSinceLastFetch >= RATE_LIMIT_INTERVAL;
};

const updateLastFetch = (): void => {
  setStoredValue(STORAGE_KEYS.LAST_FETCH, Date.now().toString());
};

// Validation utilities
const isValidGymId = (gymId: string): boolean => {
  const trimmed = gymId.trim();
  return /^\d{2,}$/.test(trimmed) && parseInt(trimmed) >= 10;
};

export default function Home() {
  const [scheduleData, setScheduleData] =
    useState<LectioScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [gymId, setGymId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Load values from localStorage on mount
  useEffect(() => {
    const storedToken = getStoredValue(STORAGE_KEYS.SESSION_TOKEN);
    const storedGymId = getStoredValue(STORAGE_KEYS.GYM_ID);

    if (storedToken) setSessionToken(storedToken);
    if (storedGymId) setGymId(storedGymId);
  }, []);

  // Save to localStorage when values change
  useEffect(() => {
    if (sessionToken) {
      setStoredValue(STORAGE_KEYS.SESSION_TOKEN, sessionToken);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (gymId) {
      setStoredValue(STORAGE_KEYS.GYM_ID, gymId);
    }
  }, [gymId]);

  const fetchSchedule = useCallback(async () => {
    if (!sessionToken.trim() || !gymId.trim()) {
      setError("Please enter both session token and gym ID");
      return;
    }

    if (!isValidGymId(gymId)) {
      setError("Gym ID must be at least 2 digits (10 or higher)");
      return;
    }

    if (!canFetch()) {
      const waitTime = Math.ceil(
        (RATE_LIMIT_INTERVAL - (Date.now() - lastFetchTime)) / 1000
      );
      setError(`Please wait ${waitTime} seconds before fetching again`);
      return;
    }

    setError(null);
    setIsLoading(true);
    updateLastFetch();
    setLastFetchTime(Date.now());

    try {
      const response = await fetch(
        `https://lectio.jonathanb.dk/api?gymId=${gymId.trim()}`,
        {
          headers: {
            "x-lectio-session": sessionToken.trim(),
          },
        }
      );

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      if (data.schedule) {
        setScheduleData(data);
        setError(null);
      } else {
        setError("No schedule data received");
      }
    } catch (err) {
      setError("Failed to fetch schedule. Please check your connection.");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, gymId, lastFetchTime]);

  // Auto-fetch when valid credentials are available
  useEffect(() => {
    if (
      sessionToken.trim() &&
      isValidGymId(gymId) &&
      !scheduleData &&
      canFetch()
    ) {
      fetchSchedule();
    }
  }, [sessionToken, gymId, scheduleData, fetchSchedule]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-40 bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gray-900">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Lectio Schedule
                </h1>
                <p className="text-sm text-gray-500">Minimal schedule viewer</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Session Token"
                  value={sessionToken}
                  onChange={(e) => setSessionToken(e.target.value)}
                  className="w-48"
                />
                <Input
                  type="text"
                  placeholder="Gym ID"
                  value={gymId}
                  onChange={(e) => setGymId(e.target.value)}
                  className="w-20"
                />
              </div>
              <Button
                onClick={fetchSchedule}
                disabled={
                  isLoading || !sessionToken.trim() || !isValidGymId(gymId)
                }
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Load"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : scheduleData ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-medium text-gray-900 mb-1">
                {scheduleData.schedule.weekRange}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{scheduleData.schedule.student.name}</span>
                <span>•</span>
                <span>{scheduleData.schedule.student.class}</span>
                <span>•</span>
                <span>{scheduleData.schedule.school}</span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 py-4 border-b border-gray-200">
              <div className="text-center">
                <div className="text-xl font-medium text-gray-900">
                  {scheduleData.schedule.summary.totalClasses}
                </div>
                <div className="text-xs text-gray-500">Classes</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-medium text-gray-900">
                  {scheduleData.schedule.summary.totalHomework}
                </div>
                <div className="text-xs text-gray-500">Homework</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-medium text-gray-900">
                  {scheduleData.schedule.summary.changedClasses +
                    scheduleData.schedule.summary.cancelledClasses}
                </div>
                <div className="text-xs text-gray-500">Changes</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-medium text-gray-900">
                  {scheduleData.schedule.summary.specialEvents}
                </div>
                <div className="text-xs text-gray-500">Events</div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-6">
              {scheduleData.schedule.days.map((day) => (
                <div key={day.date}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {day.dayName}
                    </h3>
                    <span className="text-sm text-gray-500">{day.date}</span>
                  </div>

                  {day.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border border-gray-200 rounded-lg">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No classes scheduled</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {day.items.map((item, index) => (
                        <ScheduleItemCard key={item.id || index} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Schedule Data
            </h3>
            <p className="text-gray-500 mb-4">
              Enter your session token and gym ID above to load your schedule
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
