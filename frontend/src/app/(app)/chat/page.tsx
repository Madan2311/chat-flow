export default function ChatHome() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="animate-float h-14 w-14 rounded-2xl bg-linear-to-br from-brand-400 to-accent-400 shadow-lg shadow-brand-500/40" />
      <h2 className="text-gradient text-2xl font-semibold">Selecciona una conversación</h2>
      <p className="text-slate-400">o crea un chat nuevo con tus contactos</p>
    </div>
  );
}