import { useState, useEffect } from 'react';

/**
 * Hook para countdown timer
 * @param {string} targetTime - Hora alvo no formato "HH:MM:SS" (ex: "23:59:59")
 * @returns {object} { hours, minutes, seconds, isExpired }
 */
export default function useCountdown(targetTime = "23:59:59") {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetTime));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetTime);
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  return timeLeft;
}

function calculateTimeLeft(targetTime) {
  const now = new Date();
  const [targetHours, targetMinutes, targetSeconds] = targetTime.split(':').map(Number);

  // Cria data alvo para hoje
  const target = new Date();
  target.setHours(targetHours, targetMinutes, targetSeconds, 0);

  // Se já passou do horário hoje, usa amanhã
  if (now > target) {
    target.setDate(target.getDate() + 1);
  }

  const difference = target - now;

  if (difference <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    };
  }

  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return {
    hours,
    minutes,
    seconds,
    isExpired: false
  };
}
