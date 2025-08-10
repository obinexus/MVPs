// QuantumClothSimulation.cpp
#include "QuantumClothSimulation.h"
#include "Engine/Engine.h"
#include "Kismet/GameplayStatics.h"

AQuantumClothSimulation::AQuantumClothSimulation()
{
    PrimaryActorTick.bCanEverTick = true;
    
    // Initialize with stable quantum state
    ActiveContract.CurrentState = EQuantumState::ISOLATED;
    ActiveContract.CollapseThreshold = 0.5f;
    ActiveContract.bIsStabilized = false;
}

void AQuantumClothSimulation::BeginPlay()
{
    Super::BeginPlay();
    
    if (bUseDetachMode)
    {
        EnableDetachMode(true);
    }
    
    LastStablePosition = GetActorLocation();
}

void AQuantumClothSimulation::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    
    // Anti-jitter logic
    FVector CurrentPos = GetActorLocation();
    float JitterDist = FVector::Dist(CurrentPos, LastStablePosition);
    
    if (JitterDist < JitterThreshold)
    {
        JitterSampleCount++;
        if (JitterSampleCount > 5)
        {
            LastStablePosition = CurrentPos;
            JitterSampleCount = 0;
        }
    }
    else
    {
        JitterSampleCount = 0;
    }
    
    // Process quantum state
    StabilizeQuantumField();
    
    if (ActiveContract.NegativeMassInfluence > 0.0f)
    {
        ProcessNegativeMassInteraction();
    }
}

void AQuantumClothSimulation::EnableDetachMode(bool bDetach)
{
    bUseDetachMode = bDetach;
    
    if (bDetach)
    {
        // Create independent render context
        if (GEngine)
        {
            UE_LOG(LogTemp, Warning, TEXT("OBINexus: Enabling detached render mode with flags: %s"), *DetachFlags);
            
            // Simulate Unix-style process detachment
            FPlatformProcess::CreateProc(
                TEXT("rift.exe"),
                *FString::Printf(TEXT("%s --obinexus-quantum"), *DetachFlags),
                true, false, false, nullptr, 0, nullptr, nullptr
            );
        }
    }
}

void AQuantumClothSimulation::SetUnixDetachFlags(const FString& Flags)
{
    DetachFlags = Flags;
    UE_LOG(LogTemp, Log, TEXT("OBINexus: Updated detach flags to: %s"), *Flags);
}

void AQuantumClothSimulation::UpdateQuantumContract(const FQuantumContract& NewContract)
{
    EQuantumState OldState = ActiveContract.CurrentState;
    ActiveContract = NewContract;
    
    if (OldState != NewContract.CurrentState)
    {
        HandleStateTransition(OldState, NewContract.CurrentState);
    }
}

void AQuantumClothSimulation::ApplyNegativeMassField(FVector Location, float Strength)
{
    ActiveContract.NegativeMassInfluence = Strength;
    
    // Direct coupling to negative mass system as specified
    if (ActiveContract.CurrentState == EQuantumState::OPEN)
    {
        // Must direct count to that stalvy open close
        FVector Direction = Location - GetActorLocation();
        Direction.Normalize();
        
        // Apply inverse force for negative mass interaction
        AddActorWorldOffset(Direction * -Strength * GetWorld()->GetDeltaSeconds());
    }
}

void AQuantumClothSimulation::StabilizeQuantumField()
{
    switch (ActiveContract.CurrentState)
    {
        case EQuantumState::ISOLATED:
            // System is self-contained, no external interactions
            ActiveContract.bIsStabilized = true;
            break;
            
        case EQuantumState::OPEN:
            // System can exchange energy/information
            if (ActiveContract.NegativeMassInfluence > ActiveContract.CollapseThreshold)
            {
                ActiveContract.CurrentState = EQuantumState::COLLAPSING;
            }
            break;
            
        case EQuantumState::CLOSED:
            // System exchanges energy but not matter
            ActiveContract.bIsStabilized = (JitterSampleCount > 3);
            break;
            
        case EQuantumState::COLLAPSING:
            // Quantum field collapse in progress
            if (FMath::FRand() < 0.1f) // Probabilistic collapse
            {
                ActiveContract.CurrentState = EQuantumState::CLOSED;
                ActiveContract.bIsStabilized = false;
            }
            break;
    }
}

void AQuantumClothSimulation::HandleStateTransition(EQuantumState FromState, EQuantumState ToState)
{
    UE_LOG(LogTemp, Warning, TEXT("OBINexus Quantum: State transition from %d to %d"), 
        (int32)FromState, (int32)ToState);
    
    // Reset stabilization on state change
    ActiveContract.bIsStabilized = false;
    JitterSampleCount = 0;
    
    // State-specific transition logic
    if (ToState == EQuantumState::COLLAPSING)
    {
        // Initiate quantum field collapse
        SetActorTickInterval(0.001f); // High frequency updates during collapse
    }
    else
    {
        SetActorTickInterval(0.016f); // Normal tick rate
    }
}

void AQuantumClothSimulation::ProcessNegativeMassInteraction()
{
    // As specified: "if there is a negative force mass system involved it must direct count"
    float InteractionStrength = ActiveContract.NegativeMassInfluence;
    
    // Apply quantum corrections based on state
    switch (ActiveContract.CurrentState)
    {
        case EQuantumState::OPEN:
            InteractionStrength *= 1.5f; // Amplified in open state
            break;
        case EQuantumState::CLOSED:
            InteractionStrength *= 0.5f; // Dampened in closed state
            break;
        case EQuantumState::ISOLATED:
            InteractionStrength = 0.0f; // No interaction in isolated state
            break;
    }
    
    // Update influence
    ActiveContract.NegativeMassInfluence = FMath::Lerp(
        ActiveContract.NegativeMassInfluence, 
        InteractionStrength, 
        GetWorld()->GetDeltaSeconds()
    );
}
