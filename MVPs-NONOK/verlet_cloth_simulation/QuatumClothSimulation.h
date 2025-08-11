// QuantumClothSimulation.h
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Engine/World.h"
#include "Components/SceneComponent.h"
#include "QuantumClothSimulation.generated.h"

UENUM(BlueprintType)
enum class EQuantumState : uint8
{
    ISOLATED    UMETA(DisplayName = "Isolated"),
    OPEN        UMETA(DisplayName = "Open"),
    CLOSED      UMETA(DisplayName = "Closed"),
    COLLAPSING  UMETA(DisplayName = "Collapsing")
};

USTRUCT(BlueprintType)
struct FQuantumContract
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EQuantumState CurrentState = EQuantumState::ISOLATED;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float CollapseThreshold = 0.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float NegativeMassInfluence = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bIsStabilized = false;
};

UCLASS()
class OBINEXUS_API AQuantumClothSimulation : public AActor
{
    GENERATED_BODY()

public:
    AQuantumClothSimulation();

    // Detached mode functions
    UFUNCTION(BlueprintCallable, Category = "OBINexus|Detach")
    void EnableDetachMode(bool bDetach);

    UFUNCTION(BlueprintCallable, Category = "OBINexus|Detach")
    void SetUnixDetachFlags(const FString& Flags);

    // Quantum contract functions
    UFUNCTION(BlueprintCallable, Category = "OBINexus|Quantum")
    void UpdateQuantumContract(const FQuantumContract& NewContract);

    UFUNCTION(BlueprintCallable, Category = "OBINexus|Quantum")
    void ApplyNegativeMassField(FVector Location, float Strength);

protected:
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;

    UPROPERTY(EditAnywhere, Category = "OBINexus|Config")
    bool bUseDetachMode = true;

    UPROPERTY(EditAnywhere, Category = "OBINexus|Config")
    FString DetachFlags = "--detach --no-wait --independent-render";

    UPROPERTY(VisibleAnywhere, Category = "OBINexus|Quantum")
    FQuantumContract ActiveContract;

private:
    void StabilizeQuantumField();
    void HandleStateTransition(EQuantumState FromState, EQuantumState ToState);
    void ProcessNegativeMassInteraction();

    // Anti-jitter system
    FVector LastStablePosition;
    float JitterThreshold = 0.1f;
    int32 JitterSampleCount = 0;
};
