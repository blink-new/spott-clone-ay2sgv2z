import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { 
  Search, 
  MessageSquare, 
  Users, 
  Presentation, 
  Plus,
  Send,
  Calendar,
  FileText,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react'
import { CandidateService, Candidate } from '../services/candidateService'
import { OutreachService, OutreachCampaign } from '../services/outreachService'
import { InterviewService, Interview } from '../services/interviewService'
import { PresentationService, Presentation as PresentationType } from '../services/presentationService'
import { blink } from '../blink/client'

export function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [presentations, setPresentations] = useState<PresentationType[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Auth state management
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      const [candidatesData, campaignsData, interviewsData, presentationsData] = await Promise.all([
        CandidateService.getCandidates(),
        OutreachService.getCampaigns(),
        InterviewService.getInterviews(),
        PresentationService.getPresentations()
      ])
      
      setCandidates(candidatesData)
      setCampaigns(campaignsData)
      setInterviews(interviewsData)
      setPresentations(presentationsData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearchLoading(true)
    try {
      const results = await CandidateService.searchCandidates(searchQuery)
      setCandidates(prev => [...prev, ...results])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleCreateCampaign = async (campaignData: any) => {
    try {
      const campaign = await OutreachService.createCampaign(campaignData)
      setCampaigns(prev => [...prev, campaign])
    } catch (error) {
      console.error('Error creating campaign:', error)
    }
  }

  const handleGeneratePresentation = async (candidate: Candidate) => {
    try {
      const presentation = await PresentationService.generatePresentation(candidate)
      setPresentations(prev => [...prev, presentation])
    } catch (error) {
      console.error('Error generating presentation:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg mx-auto mb-4 animate-pulse"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <CardTitle>Welcome to Spott</CardTitle>
            <CardDescription>Please sign in to access your recruiting dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => blink.auth.login()} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Spott Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => blink.auth.logout()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{candidates.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{interviews.filter(i => i.status === 'scheduled').length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presentations Sent</CardTitle>
              <Presentation className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{presentations.filter(p => p.status === 'sent').length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="source" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="source">Source</TabsTrigger>
            <TabsTrigger value="engage">Engage</TabsTrigger>
            <TabsTrigger value="interview">Interview</TabsTrigger>
            <TabsTrigger value="present">Present</TabsTrigger>
          </TabsList>

          {/* Source Tab */}
          <TabsContent value="source" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>AI-Powered Candidate Search</span>
                </CardTitle>
                <CardDescription>
                  Search for candidates using natural language queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Input
                    placeholder="e.g., Senior React developer in San Francisco with 5+ years experience"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSearch} 
                    disabled={searchLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {searchLoading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Candidates List */}
            <div className="grid gap-4">
              {candidates.map((candidate) => (
                <Card key={candidate.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{candidate.name}</h3>
                            <p className="text-gray-600">{candidate.currentPosition} at {candidate.currentCompany}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {candidate.location && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>{candidate.location}</span>
                            </div>
                          )}
                          {candidate.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <span>{candidate.email}</span>
                            </div>
                          )}
                          {candidate.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span>{candidate.phone}</span>
                            </div>
                          )}
                          {candidate.salaryExpectation && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <DollarSign className="h-4 w-4" />
                              <span>${candidate.salaryExpectation.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {candidate.skills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                          ))}
                          {candidate.skills.length > 5 && (
                            <Badge variant="outline">+{candidate.skills.length - 5} more</Badge>
                          )}
                        </div>
                        
                        <Badge 
                          variant={candidate.status === 'placed' ? 'default' : 'secondary'}
                          className={candidate.status === 'placed' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {candidate.status}
                        </Badge>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleGeneratePresentation(candidate)}
                        >
                          <Presentation className="h-4 w-4 mr-1" />
                          Generate Presentation
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Engage Tab */}
          <TabsContent value="engage" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Outreach Campaigns</h2>
                <p className="text-gray-600">Manage your automated outreach campaigns</p>
              </div>
              <CreateCampaignDialog onCreateCampaign={handleCreateCampaign} />
            </div>

            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{campaign.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center space-x-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{campaign.channel}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Send className="h-4 w-4" />
                            <span>{campaign.totalSent} sent</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>{campaign.totalResponses} responses</span>
                          </span>
                        </div>
                        <Badge 
                          variant={campaign.status === 'active' ? 'default' : 'secondary'}
                          className={campaign.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Response Rate</div>
                        <div className="text-2xl font-bold">
                          {campaign.totalSent > 0 ? Math.round((campaign.totalResponses / campaign.totalSent) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Interview Tab */}
          <TabsContent value="interview" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Interviews</h2>
                <p className="text-gray-600">Manage candidate interviews and AI summaries</p>
              </div>
            </div>

            <div className="grid gap-4">
              {interviews.map((interview) => (
                <Card key={interview.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                          Interview with {candidates.find(c => c.id === interview.candidateId)?.name || 'Unknown'}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(interview.scheduledAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>{interview.durationMinutes || 60} min</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>{interview.type}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{interview.interviewerName}</span>
                          </div>
                        </div>
                        
                        {interview.aiSummary && (
                          <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <h4 className="font-medium text-blue-900 mb-2">AI Summary</h4>
                            <p className="text-blue-800 text-sm">{interview.aiSummary}</p>
                          </div>
                        )}
                        
                        <Badge 
                          variant={interview.status === 'completed' ? 'default' : 'secondary'}
                          className={interview.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {interview.status}
                        </Badge>
                      </div>
                      
                      {interview.score && (
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Score</div>
                          <div className="text-2xl font-bold">{interview.score}/10</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Present Tab */}
          <TabsContent value="present" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Candidate Presentations</h2>
                <p className="text-gray-600">AI-generated presentations for clients</p>
              </div>
            </div>

            <div className="grid gap-4">
              {presentations.map((presentation) => (
                <Card key={presentation.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{presentation.title}</h3>
                        <p className="text-gray-600 mb-3">
                          For: {candidates.find(c => c.id === presentation.candidateId)?.name || 'Unknown'}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                          {presentation.clientEmail && (
                            <span className="flex items-center space-x-1">
                              <Mail className="h-4 w-4" />
                              <span>{presentation.clientEmail}</span>
                            </span>
                          )}
                          {presentation.sentAt && (
                            <span className="flex items-center space-x-1">
                              <Send className="h-4 w-4" />
                              <span>Sent {new Date(presentation.sentAt).toLocaleDateString()}</span>
                            </span>
                          )}
                          {presentation.viewedAt && (
                            <span className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4" />
                              <span>Viewed {new Date(presentation.viewedAt).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                        
                        <Badge 
                          variant={presentation.status === 'sent' ? 'default' : 'secondary'}
                          className={presentation.status === 'sent' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {presentation.status}
                        </Badge>
                      </div>
                      
                      <div className="flex space-x-2">
                        {presentation.status === 'draft' && (
                          <SendPresentationDialog 
                            presentation={presentation}
                            onSend={loadData}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Create Campaign Dialog Component
function CreateCampaignDialog({ onCreateCampaign }: { onCreateCampaign: (data: any) => void }) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    templateSubject: '',
    templateMessage: '',
    channel: 'email' as 'email' | 'linkedin' | 'whatsapp'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateCampaign(formData)
    setOpen(false)
    setFormData({
      name: '',
      templateSubject: '',
      templateMessage: '',
      channel: 'email'
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Outreach Campaign</DialogTitle>
          <DialogDescription>
            Set up a new automated outreach campaign
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Senior Developer Outreach"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="channel">Channel</Label>
            <Select value={formData.channel} onValueChange={(value: any) => setFormData(prev => ({ ...prev, channel: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="subject">Subject Template</Label>
            <Input
              id="subject"
              value={formData.templateSubject}
              onChange={(e) => setFormData(prev => ({ ...prev, templateSubject: e.target.value }))}
              placeholder="Exciting opportunity at [Company]"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="message">Message Template</Label>
            <Textarea
              id="message"
              value={formData.templateMessage}
              onChange={(e) => setFormData(prev => ({ ...prev, templateMessage: e.target.value }))}
              placeholder="Hi [Name], I came across your profile and was impressed by your experience at [Company]..."
              rows={4}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Create Campaign
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Send Presentation Dialog Component
function SendPresentationDialog({ presentation, onSend }: { presentation: PresentationType, onSend: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    
    try {
      const success = await PresentationService.sendPresentation(presentation.id, email)
      if (success) {
        onSend()
        setOpen(false)
        setEmail('')
      }
    } catch (error) {
      console.error('Error sending presentation:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Send className="h-4 w-4 mr-1" />
          Send
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Presentation</DialogTitle>
          <DialogDescription>
            Send this candidate presentation to a client
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <Label htmlFor="email">Client Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@company.com"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending} className="bg-blue-600 hover:bg-blue-700">
              {sending ? 'Sending...' : 'Send Presentation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}