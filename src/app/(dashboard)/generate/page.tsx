import { GenerationForm } from '@/components/generation/generation-form';

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Pixel Art</h1>
        <p className="text-muted-foreground">
          Describe what you want and let AI create pixel art for your games
        </p>
      </div>

      <GenerationForm />
    </div>
  );
}
