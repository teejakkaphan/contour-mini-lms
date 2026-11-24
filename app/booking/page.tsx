import { CreateBookingForm } from "@/components/create-booking-form";

function BookingPage() {
  return (
    <div className="w-full flex flex-col gap-12">
      <div className="grid grid-cols-5">
        <CreateBookingForm />
      </div>
    </div>
  );
}

export default BookingPage;
