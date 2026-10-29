import { getRun } from '@/lib/store';
import { RunViewer } from './RunViewer';

export default async function RunPage({ params }: { params: { id: string } }) {
  const run = await getRun(params.id);
  return <RunViewer runId={params.id} initialRun={run ?? null} />;
}
