import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    )
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
