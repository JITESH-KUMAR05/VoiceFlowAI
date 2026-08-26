/**
 * The call path, drawn as it actually runs.
 *
 * Inline SVG rather than an image so it inherits the theme tokens and stays
 * legible in both. The top row is one conversational turn, which repeats until
 * somebody hangs up; the bottom row runs once, after.
 */

const BOX = { w: 132, h: 46, r: 3 };

interface NodeProps {
  x: number;
  y: number;
  label: string;
  sub: string;
  accent?: boolean;
}

function Node({ x, y, label, sub, accent }: NodeProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={BOX.w}
        height={BOX.h}
        rx={BOX.r}
        fill="hsl(var(--card))"
        stroke={accent ? "hsl(var(--primary))" : "hsl(var(--border))"}
        strokeWidth={accent ? 1.5 : 1}
      />
      <text
        x={x + BOX.w / 2}
        y={y + 19}
        textAnchor="middle"
        fontSize="12"
        fontWeight="500"
        fill="hsl(var(--foreground))"
      >
        {label}
      </text>
      <text
        x={x + BOX.w / 2}
        y={y + 34}
        textAnchor="middle"
        fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace"
        fill="hsl(var(--muted-foreground))"
      >
        {sub}
      </text>
    </g>
  );
}

function Arrow({ x1, y, x2 }: { x1: number; y: number; x2: number }) {
  return (
    <line
      x1={x1}
      y1={y}
      x2={x2}
      y2={y}
      stroke="hsl(var(--muted-foreground))"
      strokeWidth="1"
      markerEnd="url(#arrowhead)"
    />
  );
}

export function CallPathDiagram() {
  const gap = 34;
  const step = BOX.w + gap;
  const xs = [0, step, step * 2, step * 3].map((x) => x + 8);
  const rowOne = 30;
  const rowTwo = 148;

  return (
    <figure className="panel overflow-x-auto p-4">
      <svg
        viewBox="0 0 680 220"
        className="h-auto w-full min-w-[620px]"
        role="img"
        aria-label="One conversational turn runs from Twilio through FastAPI to Azure OpenAI and back out through Murf speech synthesis. When the call ends, the transcript is scored and written to Salesforce and a follow-up email."
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="2.5"
            orient="auto"
          >
            <path d="M0,0 L6,2.5 L0,5 Z" fill="hsl(var(--muted-foreground))" />
          </marker>
        </defs>

        <text
          x="8"
          y="14"
          fontSize="9.5"
          fontFamily="'IBM Plex Mono', monospace"
          letterSpacing="0.08em"
          fill="hsl(var(--muted-foreground))"
        >
          EVERY TURN
        </text>

        <Node
          x={xs[0]}
          y={rowOne}
          label="Twilio"
          sub="PSTN + speech"
        />
        <Arrow x1={xs[0] + BOX.w} y={rowOne + BOX.h / 2} x2={xs[1] - 4} />

        <Node x={xs[1]} y={rowOne} label="FastAPI" sub="session state" accent />
        <Arrow x1={xs[1] + BOX.w} y={rowOne + BOX.h / 2} x2={xs[2] - 4} />

        <Node x={xs[2]} y={rowOne} label="Azure GPT-4o" sub="the reply" />
        <Arrow x1={xs[2] + BOX.w} y={rowOne + BOX.h / 2} x2={xs[3] - 4} />

        <Node x={xs[3]} y={rowOne} label="Murf" sub="streamed WAV" />

        {/* Audio returns to the caller: down, back along, and up. */}
        <path
          d={`M ${xs[3] + BOX.w / 2} ${rowOne + BOX.h}
              L ${xs[3] + BOX.w / 2} ${rowOne + BOX.h + 24}
              L ${xs[0] + BOX.w / 2} ${rowOne + BOX.h + 24}
              L ${xs[0] + BOX.w / 2} ${rowOne + BOX.h + 4}`}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1"
          strokeDasharray="3 3"
          markerEnd="url(#arrowhead)"
        />
        <text
          x={xs[1] + BOX.w / 2}
          y={rowOne + BOX.h + 38}
          textAnchor="middle"
          fontSize="9.5"
          fontFamily="'IBM Plex Mono', monospace"
          fill="hsl(var(--muted-foreground))"
        >
          audio streams back as it is generated
        </text>

        <line
          x1="8"
          y1={rowTwo - 26}
          x2="672"
          y2={rowTwo - 26}
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        <text
          x="8"
          y={rowTwo - 10}
          fontSize="9.5"
          fontFamily="'IBM Plex Mono', monospace"
          letterSpacing="0.08em"
          fill="hsl(var(--muted-foreground))"
        >
          ONCE, ON HANGUP
        </text>

        <Node x={xs[0]} y={rowTwo} label="Transcript" sub="full history" />
        <Arrow x1={xs[0] + BOX.w} y={rowTwo + BOX.h / 2} x2={xs[1] - 4} />

        <Node x={xs[1]} y={rowTwo} label="Azure GPT-4o" sub="weighted score" />
        <Arrow x1={xs[1] + BOX.w} y={rowTwo + BOX.h / 2} x2={xs[2] - 4} />

        <Node x={xs[2]} y={rowTwo} label="Salesforce" sub="Lead + Task" />
        <Arrow x1={xs[2] + BOX.w} y={rowTwo + BOX.h / 2} x2={xs[3] - 4} />

        <Node x={xs[3]} y={rowTwo} label="SMTP" sub="follow-up" />
      </svg>
    </figure>
  );
}
