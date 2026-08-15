import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://api.github.com')
    return NextResponse.json({ ok: true, status: res.status })
  } catch (err) {
    console.error('Test fetch falló:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}