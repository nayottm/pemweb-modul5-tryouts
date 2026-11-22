import { useEffect, useState } from 'react';

const QUESTION_DURATION_SECONDS = 120;

const INTERVIEW_QUESTIONS: readonly string[] = [
  'Ceritakan bug tersulit saat mengelola state di proyek React yang pernah kamu buat, dan bagaimana kamu memperbaikinya?',
  'Apa perbedaan fundamental antara state lokal, derived state, dan efek samping di React? Berikan contoh kasus nyata.',
  'Bagaimana kamu mencegah race condition atau memory leak saat melakukan fetch API di dalam komponen React?',
  'Jelaskan bagaimana kamu merancang struktur tipe TypeScript yang ketat agar aman dari error runtime tanpa memakai tipe any.',
  'Jika jadwal rilis tinggal 2 hari dan fitur belum selesai diuji, langkah prioritas apa yang akan kamu ambil bersama tim?',
  'Ceritakan pengalamanmu bekerja dalam tim saat terjadi perbedaan pendapat teknis tentang arsitektur kode.',
];

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function InterviewPrepTimer() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_DURATION_SECONDS);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning]);

  const handleToggle = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(QUESTION_DURATION_SECONDS);
      setIsRunning(true);
      return;
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(QUESTION_DURATION_SECONDS);
  };

  const handleNextQuestion = () => {
    setIsRunning(false);
    setSecondsLeft(QUESTION_DURATION_SECONDS);
    setQuestionIndex((prev) => (prev + 1) % INTERVIEW_QUESTIONS.length);
  };

  const progressRatio = secondsLeft / QUESTION_DURATION_SECONDS;
  const circumference = 2 * Math.PI * 38;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <section className="prep-card" aria-label="Latihan interview berwaktu">
      <div className="prep-header">
        <h3>Latihan Interview</h3>
        <span className="mono-badge">
          Soal {questionIndex + 1} / {INTERVIEW_QUESTIONS.length}
        </span>
      </div>

      <blockquote className="prep-question">
        &ldquo;{INTERVIEW_QUESTIONS[questionIndex]}&rdquo;
      </blockquote>

      <div className="timer-console">
        <div className="timer-ring-wrap">
          <svg className="timer-ring" viewBox="0 0 88 88" aria-hidden="true">
            <circle className="timer-track" cx="44" cy="44" r="38" />
            <circle
              className={`timer-progress ${secondsLeft <= 20 ? 'is-urgent' : ''}`}
              cx="44"
              cy="44"
              r="38"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <span
            className={`timer-readout ${secondsLeft === 0 ? 'is-finished' : ''}`}
            aria-live="off"
          >
            {formatTimer(secondsLeft)}
          </span>
        </div>

        <div className="timer-controls">
          <button type="button" className="btn-primary" onClick={handleToggle}>
            {isRunning ? 'Jeda' : secondsLeft === 0 ? 'Ulangi' : 'Mulai'}
          </button>
          <button type="button" className="btn-outline" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="btn-solid" onClick={handleNextQuestion}>
            Soal Berikutnya
          </button>
        </div>
      </div>

      {secondsLeft === 0 && (
        <p className="timer-done-note">
          Waktu habis. Evaluasi jawabanmu lalu lanjut ke soal berikutnya.
        </p>
      )}
    </section>
  );
}