"use client";

interface Props {
  onSubmit: (rating: number) => void;
}

export function ConfidenceModal({ onSubmit }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="border border-gruvbox-gray-light bg-gruvbox-bg-soft rounded-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-semibold mb-4 text-gruvbox-fg">
          How confident do you feel about this problem?
        </h2>
        <div className="flex gap-3 justify-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onSubmit(n)}
              className="w-10 h-10 rounded-full bg-gruvbox-bg-dark text-gruvbox-fg-light hover:bg-gruvbox-orange hover:text-gruvbox-bg transition-colors"
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-center mt-3 text-gruvbox-gray">1 = not confident, 5 = very confident</p>
      </div>
    </div>
  );
}
