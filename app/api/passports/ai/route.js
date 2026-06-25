import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

let _client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable არ არის დაყენებული');
  }
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function POST(request) {
  const { code, question, history = [] } = await request.json();
  if (!code || !question?.trim()) {
    return Response.json({ error: 'code და question საჭიროა' }, { status: 400 });
  }

  const { data } = await supabase.from('store').select('data').eq('id', 1).single();
  const db = data?.data;
  const passport = (db?.passports || []).find(p => p.code === code);
  if (!passport || passport.status !== 'active') {
    return Response.json({ error: 'Passport not found' }, { status: 404 });
  }

  const client_data = (db?.clients || []).find(c => c.id === passport.clientId);

  const systemPrompt = `შენ ხარ SmartPro Georgia-ს ტექნიკური ასისტენტი.
კლიენტი სვამს კითხვებს კონკრეტული პროექტის შესახებ.

პროექტის ინფორმაცია:
- სახელი: ${passport.title}
- კოდი: ${passport.code}
- აღწერა: ${passport.description || '—'}
- კლიენტი: ${client_data?.name || '—'}
- შესრულების თარიღი: ${passport.completedDate || '—'}
- ტიპი: ${passport.projectType || '—'}
- სტანდარტები: ${passport.standards || '—'}
- ინსტრუქციები: ${passport.instructions || '—'}
- ფაილების რაოდენობა: ${(passport.files || []).length}

შენი ამოცანაა:
1. კლიენტს ახსნა ტექნიკური კითხვები მარტივი ქართული ენით
2. თუ კითხვა სცდება ამ პროექტის scope-ს, გადაამისამართე SmartPro-ს ნომერზე: +995 505 55 65 65
3. უსაფრთხოებასთან დაკავშირებულ გადაუდებელ კითხვებზე (კვეთა, ხანძარი) — მაშინვე ძაბვის გათიშვა ურჩიე და 112 გამოიძახე
4. ყოველთვის ჩამოასრულე პასუხი SmartPro-ს კონტაქტებით თუ კომპლექსური საკითხია

გამოიყენე მხოლოდ ქართული ენა.`;

  try {
    const client = getClient();
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: question },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    return Response.json({ answer: response.content[0].text });
  } catch (e) {
    console.error('passport AI error', e);
    return Response.json({ error: 'AI სერვისი დროებით მიუწვდომელია' }, { status: 500 });
  }
}
