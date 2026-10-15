import { Calendar, Download } from 'lucide-react';
import { googleCalendarUrl, buildIcs } from '../../../server/domain';

type Props = {
  coupleNames: string;
  weddingDate: string;
  ceremonyTime: string;
  invitationMessage: string;
  location: string;
  buttonClass?: string;
};

export default function CalendarButtons({
  coupleNames,
  weddingDate,
  ceremonyTime,
  invitationMessage,
  location,
  buttonClass = 'rounded-full border border-current/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-current/10 transition-colors inline-flex items-center gap-2',
}: Props) {
  const gCalUrl = googleCalendarUrl({
    coupleNames,
    weddingDate,
    ceremonyTime,
    invitationMessage,
    location,
  });

  const handleDownloadIcs = () => {
    const icsContent = buildIcs({
      coupleNames,
      weddingDate,
      ceremonyTime,
      invitationMessage,
      location,
    });
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `casamento-${coupleNames.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <a
        href={gCalUrl}
        target="_blank"
        rel="noreferrer"
        className={buttonClass}
      >
        <Calendar size={14} />
        <span>Salvar no Google Calendar</span>
      </a>

      <button
        type="button"
        onClick={handleDownloadIcs}
        className={buttonClass}
      >
        <Download size={14} />
        <span>Apple / Outlook (.ics)</span>
      </button>
    </div>
  );
}
