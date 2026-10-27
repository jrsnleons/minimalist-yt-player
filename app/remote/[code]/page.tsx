import { RemoteController } from '@/components/remote/RemoteController';

export default async function RemotePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RemoteController code={code.toUpperCase()} />;
}
