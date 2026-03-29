export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        {/* Animated blobs */}
        <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 right-0 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-400/15 rounded-full blur-3xl animate-pulse [animation-delay:4s]" />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full">
        {/* Left panel — branding (desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">Ethos Stock</span>
            </div>
          </div>

          <div className="space-y-8 max-w-md">
            <div>
              <h1 className="text-5xl font-bold tracking-tight leading-[1.15]">
                Gestión de<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">
                  inventario
                </span>
                <br />inteligente.
              </h1>
              <p className="mt-5 text-base text-white/50 leading-relaxed">
                Controlá tu stock en tiempo real, importá catálogos
                y gestioná tu equipo desde un solo lugar.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { text: 'Control de stock con alertas automáticas' },
                { text: 'Importación masiva desde Excel' },
                { text: 'Roles y permisos granulares' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-white/60">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/25">
            Ethos Stock v0.1.0
          </p>
        </div>

        {/* Right panel — glass card with form */}
        <div className="flex-1 flex items-center justify-center p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
