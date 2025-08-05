// components/ui/FadeScale.jsx
export default function FadeScale({ isClosing, children }) {
    return (
      <div
        className={`transition-all duration-300 ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {children}
      </div>
    );
  }
  