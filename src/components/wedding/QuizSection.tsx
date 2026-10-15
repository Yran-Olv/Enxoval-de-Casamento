import { useState } from 'react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import type { QuizItem } from '../../../server/domain';
import { HelpCircle, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  quiz: QuizItem[];
  coupleNames: string;
};

const defaultQuiz: QuizItem[] = [
  {
    id: 'q1',
    question: 'Onde foi o primeiro encontro dos noivos?',
    options: ['Num café charmoso no centro', 'Numa pizzaria com amigos', 'Num parque da cidade', 'Num show ao vivo'],
    answerIndex: 0,
    explanation: 'Foi num café pequeno! Conversamos por mais de quatro horas sem ver o tempo passar.',
  },
  {
    id: 'q2',
    question: 'Quem disse "eu te amo" primeiro?',
    options: ['O noivo', 'A noiva', 'Os dois ao mesmo tempo', 'Nenhum dos dois admite até hoje!'],
    answerIndex: 0,
    explanation: 'O noivo não aguentou guardar o sentimento e se declarou primeiro!',
  },
  {
    id: 'q3',
    question: 'Qual é o prato preferido que eles mais adoram cozinhar juntos?',
    options: ['Lasanha caseira', 'Hambúrguer artesanal', 'Risoto aos quatro queijos', 'Fondue no inverno'],
    answerIndex: 2,
    explanation: 'Risoto aos quatro queijos! Já virou a tradição oficial de sexta-feira à noite.',
  },
];

export default function QuizSection({ theme, quiz, coupleNames }: Props) {
  const p = theme.palette;
  const questions = quiz && quiz.length > 0 ? quiz : defaultQuiz;
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (selectedAnswers[qIdx] !== undefined) return; // já respondeu
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = questions.reduce((acc, q, idx) => {
    return acc + (selectedAnswers[idx] === q.answerIndex ? 1 : 0);
  }, 0);

  const reset = () => {
    setSelectedAnswers({});
    setShowResult(false);
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
            <HelpCircle size={14} /> Jogo dos Noivos
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Quanto Você Conhece o Casal?
          </h2>
          <p className="mt-3 text-sm opacity-75 max-w-md mx-auto">
            Teste sua afinidade com {coupleNames} respondendo a esse quiz rápido!
          </p>
        </div>

        {/* Placar de progresso */}
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-current/15 text-xs uppercase tracking-widest font-semibold opacity-70">
          <span>Respondidas: {answeredCount} de {questions.length}</span>
          <span>Acertos: {correctCount}</span>
        </div>

        {/* Lista de Perguntas */}
        <div className="space-y-8">
          {questions.map((q, qIdx) => {
            const hasAnswered = selectedAnswers[qIdx] !== undefined;
            const chosen = selectedAnswers[qIdx];
            const isCorrect = chosen === q.answerIndex;

            return (
              <div key={q.id} className={`p-6 sm:p-8 ${theme.cardClass}`}>
                <div className="flex items-start gap-3 mb-4">
                  <span
                    className="w-7 h-7 shrink-0 rounded-full grid place-items-center text-xs font-bold text-white"
                    style={{ background: p.accent }}
                  >
                    {qIdx + 1}
                  </span>
                  <h3 className="text-lg sm:text-xl font-serif font-semibold pt-0.5" style={{ fontFamily: theme.fontTitle }}>
                    {q.question}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {q.options.map((opt, optIdx) => {
                    let btnStyle = 'bg-current/5 border-transparent hover:bg-current/10';
                    if (hasAnswered) {
                      if (optIdx === q.answerIndex) {
                        btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-800 font-bold';
                      } else if (optIdx === chosen) {
                        btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-800 line-through';
                      } else {
                        btnStyle = 'opacity-40';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelect(qIdx, optIdx)}
                        disabled={hasAnswered}
                        className={`text-left p-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {hasAnswered && optIdx === q.answerIndex && (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 ml-2" />
                        )}
                        {hasAnswered && optIdx === chosen && !isCorrect && (
                          <XCircle size={16} className="text-rose-600 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {hasAnswered && q.explanation && (
                  <p className="mt-4 text-xs italic opacity-80 pt-3 border-t border-current/10">
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Conclusão do Quiz */}
        {answeredCount === questions.length && (
          <div className={`mt-10 p-8 ${theme.cardClass} text-center shadow-xl`}>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full grid place-items-center bg-current/10" style={{ color: p.accent }}>
              <Trophy size={28} />
            </div>
            <h3 className="text-2xl font-serif font-bold" style={{ fontFamily: theme.fontTitle }}>
              {correctCount === questions.length
                ? 'Incrível! Você é um amigo de verdade! 🌟'
                : correctCount >= questions.length / 2
                ? 'Muito bom! Você conhece bem o casal! 💛'
                : 'Valeu a tentativa! No casamento você descobre o resto! 😉'}
            </h3>
            <p className="mt-2 text-sm opacity-80">
              Você acertou {correctCount} de {questions.length} perguntas.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center gap-2 text-xs uppercase font-semibold tracking-wider hover:underline"
              style={{ color: p.accent }}
            >
              <RotateCcw size={14} /> Jogar Novamente
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
