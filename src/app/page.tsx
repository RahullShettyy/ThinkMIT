import { getContent } from '@/lib/content';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import AboutBento from '@/components/AboutBento';
import Journey from '@/components/Journey';
import Domains from '@/components/Domains';
import PromoVideo from '@/components/PromoVideo';
import Guidelines from '@/components/Guidelines';
import SelectedTeams, { SelectedTeamItem } from '@/components/SelectedTeams';
import CtaBand from '@/components/CtaBand';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export const revalidate = 60; // ISR cache default

export default async function HomePage() {
  const content = await getContent();

  let selectedTeams: SelectedTeamItem[] = [];
  if (content.announcements?.published) {
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        // Query strictly selected teams and only public fields: team_name, track_key, idea_title
        const { data: rows } = await supabase
          .from('teams')
          .select('team_name, track_key, idea_title')
          .eq('status', 'selected')
          .order('team_name', { ascending: true });

        const trackMap: Record<string, string> = {};
        ((content.tracks as Array<{ key: string; name?: string; title?: string }>) || []).forEach((t) => {
          trackMap[t.key] = t.name || t.title || t.key;
        });

        if (rows) {
          selectedTeams = rows.map((r) => ({
            teamName: r.team_name,
            trackName: trackMap[r.track_key] || r.track_key,
            ideaTitle: r.idea_title,
          }));
        }
      }
    } catch (e) {
      console.warn('Error fetching selected teams:', e);
    }
  }

  return (
    <>
      <Nav content={content} />
      <main>
        <Hero content={content} />
        <AboutBento content={content} />
        <Journey content={content} />
        <Domains content={content} />
        <PromoVideo content={content} />
        <Guidelines content={content} />
        <SelectedTeams content={content} teams={selectedTeams} />
        <section className="s-foot" id="start">
          <div className="wrap">
            <CtaBand content={content} />
            <Contact content={content} />
          </div>
        </section>
      </main>
      <Footer content={content} />
    </>
  );
}
