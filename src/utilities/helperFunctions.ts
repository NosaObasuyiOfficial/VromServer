import riderRequest from "../database/databaseModel/riderRequest.js";
import RideOrder from "../database/databaseModel/rideOrder.js";

export async function generateUniqueACCode(): Promise<string> {
  function generate4Digit(): string {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `vr${randomNumber}`;
  }

  // let code: string;
  // let exists = true;

  // while (exists) {
  //   const newDigits = generate4Digit();
  //   code = `vr${newDigits}`;

  //   await riderRequest.exists({ code });
  // }

  // return code!;

   const newDigits = generate4Digit();
    return `vr${newDigits}`;
}

export function formatDate(date: Date = new Date()): string {
  const day = date.getDate();

  const getDaySuffix = (day: number) => {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const suffix = getDaySuffix(day);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12 || 12;
  const formattedHours = hours.toString().padStart(2, "0");

  return `${day}${suffix} ${month}, ${year}. ${formattedHours}:${minutes}${ampm}`;
}

export async function generateAcceptCode(): Promise<string> {
  function generate4Digit(): string {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `ac${randomNumber}`;
  }

  // let acceptCode: string;
  // let exists = true;

  // while (exists) {
  //   const newDigits = generate4Digit();
  //   acceptCode = `ac${newDigits}`;

  //   await RideOrder.exists({ acceptCode });
  // }

  // return acceptCode!;

  const newDigits = generate4Digit();
  return `ac${newDigits}`;
}
