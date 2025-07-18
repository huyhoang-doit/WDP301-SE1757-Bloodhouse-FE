"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CalendarIcon,
  Clock,
  MapPin,
  Droplets,
  Heart,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { instance } from "@/services/instance";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "@/hooks/useAuth";

// Enhanced Schema with time and expected quantity validation
const formSchema = z
  .object({
    facilityId: z.string().min(1, "Vui lòng chọn trung tâm hiến máu"),
    source: z.enum(["Tự nguyện", "Yêu cầu"], {
      required_error: "Vui lòng chọn hình thức hiến máu",
    }),
    bloodGroupId: z.string().min(1, "Vui lòng chọn nhóm máu"),
    expectedQuantity: z
      .number({
        required_error: "Vui lòng nhập lượng máu",
        invalid_type_error: "Lượng máu phải là một số",
      })
      .nonnegative("Lượng máu không được là số âm")
      .min(100, "Lượng máu phải ít nhất 100 mL")
      .max(500, "Lượng máu không được vượt quá 500 mL")
      .optional(),
    date: z
      .date({
        required_error: "Vui lòng chọn ngày hiến máu",
      })
      .refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
        message: "Ngày hiến máu không thể là ngày trong quá khứ",
      }),
    time: z.string().min(1, "Vui lòng chọn giờ hiến máu"),
    notes: z.string().optional(),
  })
  .refine(
    ({ date, time }) => {
      if (!date || !time || !isSameDay(date, new Date())) return true;
      const [hours, minutes] = time.split(":").map(Number);
      const selectedTime = new Date().setHours(hours, minutes, 0, 0);
      const now = new Date();
      return selectedTime > now;
    },
    {
      message: "Giờ hiến máu không thể là thời gian trong quá khứ",
      path: ["time"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

const timeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

export function BloodDonationRegistrationForm({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}) {
  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [facilities, setFacilities] = useState<
    { id: string; name: string; address?: string }[]
  >([]);
  const [bloodGroups, setBloodGroups] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const { isAuthenticated } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      facilityId: "",
      source: "Tự nguyện",
      bloodGroupId: "",
      expectedQuantity: undefined,
      date: undefined,
      time: "",
      notes: "",
    },
  });

  const selectedDate = form.watch("date");

  useEffect(() => {
    if (selectedDate && isSameDay(selectedDate, new Date())) {
      form.setValue("time", "");
    }
  }, [selectedDate, form]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [fRes, bgRes] = await Promise.all([
          instance.get("/facility"),
          instance.get("/blood-group"),
        ]);

        setFacilities(
          fRes.data.data.result.map((f: any) => ({
            id: f._id,
            name: f.name,
            address: f.address || "",
          }))
        );
        setBloodGroups(
          bgRes.data.data.map((bg: any) => ({
            id: bg._id,
            name: bg.name,
          }))
        );
      } catch (err) {
        console.error("Lỗi fetch dropdown:", err);
        setErrorLoading("Không thể tải dữ liệu, thử tải lại trang.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filteredTimeSlots =
    selectedDate && isSameDay(selectedDate, new Date())
      ? timeSlots.filter((time) => {
          const [hours, minutes] = time.split(":").map(Number);
          const slotTime = new Date().setHours(hours, minutes, 0, 0);
          return slotTime > new Date();
        })
      : timeSlots;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const preferredDate = format(
        new Date(
          values.date.getFullYear(),
          values.date.getMonth(),
          values.date.getDate(),
          +values.time.split(":")[0],
          +values.time.split(":")[1]
        ),
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
      );

      const payload = {
        facilityId: values.facilityId,
        source: values.source,
        bloodGroupId: values.bloodGroupId,
        expectedQuantity: values.expectedQuantity ?? 0,
        preferredDate,
        notes: values.notes,
      };

      console.log("Submitting payload:", payload);
      const { data } = await instance.post(
        "/blood-donation-registration",
        payload
      );

      toast.success(
        data.message ||
          "Đăng ký hiến máu thành công! Chúng tôi sẽ liên hệ với bạn để xác nhận lịch hẹn.",
        { duration: 3000 }
      );

      form.setValue("facilityId", "");
      form.setValue("source", "Tự nguyện");
      form.setValue("bloodGroupId", "");
      form.setValue("expectedQuantity", undefined);
      form.setValue("time", "");
      form.setValue("notes", "");
      form.setValue("date", undefined);

      form.reset({
        facilityId: "",
        source: "Tự nguyện",
        bloodGroupId: "",
        expectedQuantity: undefined,
        time: "",
        notes: "",
        date: undefined,
      });
      setFormKey((prev) => prev + 1);
      console.log("Form state after reset:", form.getValues());

      setTimeout(() => {
        toast.dismiss();
        setFormStatus(null);
      }, 3000);
      onSuccess?.(data);
    } catch (error: any) {
      console.error("Submission error:", {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        message: error.message,
      });
      toast.error(
        error?.response?.status === 404
          ? "Không tìm thấy endpoint. Vui lòng kiểm tra backend hoặc gateway."
          : error?.response?.data?.message ||
              "Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại sau.",
        { duration: 8000 }
      );
      setFormStatus({ type: "error", message: "" });
      onError?.(error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <span className="ml-2 text-gray-600">Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (errorLoading) {
    return (
      <Alert
        variant="destructive"
        className="border-red-500 bg-red-50 text-red-800"
      >
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertTitle className="font-semibold text-red-600">Lỗi</AlertTitle>
        <AlertDescription>{errorLoading}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            style: {
              background: "#F0FFF4",
              color: "#2F855A",
              border: "2px solid #68D391",
            },
            iconTheme: {
              primary: "#2F855A",
              secondary: "#F0FFF4",
            },
          },
          error: {
            style: {
              background: "#FFF5F5",
              color: "#C53030",
              border: "2px solid #F87171",
            },
            iconTheme: {
              primary: "#C53030",
              secondary: "#FFF5F5",
            },
          },
        }}
      />
      <Form key={formKey} {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Thông tin cơ bản */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Heart className="h-5 w-5" />
                Thông tin hiến máu
              </CardTitle>
              <CardDescription>
                Vui lòng điền đầy đủ thông tin để đăng ký lịch hiến máu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trung tâm hiến máu */}
                <FormField
                  control={form.control}
                  name="facilityId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-h-[100px]">
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-red-500" />
                        Trung tâm hiến máu
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Chọn trung tâm hiến máu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {facilities.map((facility) => (
                            <SelectItem key={facility.id} value={facility.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {facility.name}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {facility.address || "Không có địa chỉ"}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
                {/* Nguồn hiến máu */}
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-h-[100px]">
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        Hình thức hiến máu
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Chọn hình thức hiến máu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Tự nguyện">Tự nguyện</SelectItem>
                          <SelectItem value="Yêu cầu">Theo yêu cầu</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="bloodGroupId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-h-[100px]">
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <Droplets className="h-4 w-4 text-red-500" />
                        Nhóm máu
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Chọn nhóm máu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bloodGroups.map((bg) => (
                            <SelectItem key={bg.id} value={bg.id}>
                              <Badge
                                variant="outline"
                                className="text-red-600 border-red-200"
                              >
                                {bg.name}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedQuantity"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-h-[100px]">
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <Droplets className="h-4 w-4 text-red-500" />
                        Lượng máu dự kiến (mL)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Nhập lượng máu (mL)"
                          className="h-9 w-full"
                          min="0"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Thời gian */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <CalendarIcon className="h-5 w-5" />
                Thời gian hiến máu
              </CardTitle>
              <CardDescription>
                Chọn ngày và giờ phù hợp cho buổi hiến máu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ngày hiến máu */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-h-[100px]">
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="h-4 w-4 text-red-500" />
                        Ngày hiến máu
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "h-9 w-full pl-3 text-left font-normal hover:bg-red-50 hover:text-red-600",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "EEEE, dd MMMM yyyy", {
                                    locale: vi,
                                  })
                                : "Chọn ngày hiến máu"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              if (date && isSameDay(date, new Date())) {
                                form.setValue("time", "");
                              }
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            locale={vi}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />

                {/* Giờ hiến máu */}
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-h-[100px]">
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-red-500" />
                        Giờ hiến máu
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Chọn giờ hiến máu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredTimeSlots.length > 0 ? (
                            filteredTimeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-gray-500">
                              Không có giờ khả dụng cho ngày này
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {filteredTimeSlots.length === 0 && selectedDate && (
                        <Alert
                          variant="destructive"
                          className="mt-2 border-red-500 bg-red-50 text-red-800"
                        >
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <AlertTitle className="font-semibold text-red-600">
                            Thông báo
                          </AlertTitle>
                          <AlertDescription>
                            Không có khung giờ hiến máu nào khả dụng cho ngày đã
                            chọn. Vui lòng chọn ngày khác.
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ghi chú */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <FileText className="h-5 w-5" />
                Thông tin bổ sung
              </CardTitle>
              <CardDescription>
                Thông tin y tế hoặc ghi chú đặc biệt (không bắt buộc)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Ví dụ: Tiền sử bệnh lý, thuốc đang sử dụng, yêu cầu đặc biệt..."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="mt-2" />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {!isAuthenticated ? (
            <>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={!isAuthenticated}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Đăng ký hiến máu
                </Button>
              </div>
              <div className="text-sm text-muted-foreground flex items-center">
                <span className="text-red-600 mr-1">*</span>
                Vui lòng đăng nhập để đăng ký hiến máu
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Heart className="mr-2 h-4 w-4" />
                    Đăng ký hiến máu
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}