const processDefinition: any = {
  name: "process1",
  label: "Proceso de prueba",
  elements: [
    {
      name: "task1",
      label: "",
      type: "task",
      elementType: "manual",
      start: true,
      end: false,
      events: [],
      actors: [],
      next: "task2"
    },
    {
      name: "task2",
      label: "",
      type: "task",
      elementType: "rpc",
      start: false,
      end: false,
      block: true,
      events: [],
      actors: [],
      next: "gate1",
      request: {
        url: "http://localhost:3000/api/payment",
        method: "POST",
        queryParams: [
          {
            modelField: "processInstanceId",
            paramName: "processInstanceId"
          }
        ],
        body: ["modelField"]
      },
      modelPatchField: ["status"]
    },
    {
      name: "gate1",
      label: "",
      type: "gateway",
      elementType: "or",
      gatewayCondition: {
        isGroup: true,
        groupCombinationOperator: "AND",
        conditionGroups: [
          {
            groupOperator: "AND",
            conditions: [
              {
                fieldName: "age",
                operator: "greaterThan",
                comparativeValue: 18
              },
              {
                fieldName: "isStudent",
                operator: "equal",
                comparativeValue: false
              }
            ]
          },
          {
            groupOperator: "OR",
            conditions: [
              {
                fieldName: "country",
                operator: "equal",
                comparativeValue: "USA"
              },
              {
                fieldName: "city",
                operator: "equal",
                comparativeValue: "London"
              }
            ]
          }
        ]
      },
      nextIsTrue: "task3",
      nextIsFalse: "task4"
    },
    {
      name: "task3",
      label: "Enroll in the program",
      type: "task",
      elementType: "manual",
      start: false,
      end: true,
      events: [],
      actors: [],
      next: null
    },
    {
      name: "task4",
      label: "Send program benefits",
      type: "task",
      elementType: "manual",
      start: false,
      end: true,
      events: [],
      actors: [],
      next: null
    }
  ]
};

enum LogicalOperator {
  GreaterThan = "greaterThan",
  Equal = "equal",
  LessThan = "lessThan",
  NotEqual = "notEqual",
  GreaterThanOrEqual = "greaterThanOrEqual",
  LessThanOrEqual = "lessThanOrEqual"
}

/**
 * Represents a single condition within a group.
 */
interface Condition {
  fieldName: string;
  operator: LogicalOperator;
  comparativeValue: number | boolean | string;
}

/**
 * Represents a group of conditions.
 */
interface ConditionGroup {
  groupOperator: "AND" | "OR";
  conditions: Condition[];
}

/**
 * Evaluates a single condition.
 * @param condition - The condition to be evaluated.
 * @param fieldIndex - The index of field values.
 * @returns Whether the condition evaluates to true or false.
 */
const evaluateSingleCondition = (
  condition: Condition,
  fieldIndex: Record<string, any>
): boolean => {
  const fieldValue = fieldIndex[condition.fieldName];

  switch (condition.operator) {
    case LogicalOperator.GreaterThan:
      return fieldValue > condition.comparativeValue;
    case LogicalOperator.Equal:
      return fieldValue === condition.comparativeValue;
    case LogicalOperator.LessThan:
      return fieldValue < condition.comparativeValue;
    case LogicalOperator.NotEqual:
      return fieldValue !== condition.comparativeValue;
    case LogicalOperator.GreaterThanOrEqual:
      return fieldValue >= condition.comparativeValue;
    case LogicalOperator.LessThanOrEqual:
      return fieldValue <= condition.comparativeValue;
    default:
      return false;
  }
};

/**
 * Recursively evaluates a condition group.
 * @param group - The condition group to be evaluated.
 * @param fieldIndex - The index of field values.
 * @returns Whether the condition group evaluates to true or false.
 */
const evaluateGroup = (
  group: ConditionGroup,
  fieldIndex: Record<string, any>
): boolean => {
  if (group.groupOperator === "AND") {
    return group.conditions.every((condition: Condition) =>
      evaluateSingleCondition(condition, fieldIndex)
    );
  } else if (group.groupOperator === "OR") {
    return group.conditions.some((condition: Condition) =>
      evaluateSingleCondition(condition, fieldIndex)
    );
  }

  return false;
};

/**
 * Evaluates conditions based on input data.
 * @param data - The input data for evaluation.
 * @param gateway - The gateway with conditions to be evaluated.
 * @returns The next step based on the evaluation result.
 */
const evaluateConditions = (data: Record<string, any>, gateway: any) => {
  const conditions = gateway.gatewayCondition;
  if (conditions.isGroup) {
    const fieldIndex: Record<string, any> = {};

    for (const group of conditions.conditionGroups) {
      for (const field of group.conditions) {
        fieldIndex[field.fieldName] = data[field.fieldName];
      }
    }

    if (conditions.groupCombinationOperator === "AND") {
      return conditions.conditionGroups.every((group: ConditionGroup) =>
        evaluateGroup(group, fieldIndex)
      )
        ? gateway.nextIsTrue
        : gateway.nextIsFalse;
    } else if (conditions.groupCombinationOperator === "OR") {
      return conditions.conditionGroups.some((group: ConditionGroup) =>
        evaluateGroup(group, fieldIndex)
      )
        ? gateway.nextIsTrue
        : gateway.nextIsFalse;
    }
  } else {
    return evaluateSingleCondition(conditions.condition, data)
      ? gateway.nextIsTrue
      : gateway.nextIsFalse;
  }
};

// Example data and condition
const inputData: Record<string, any> = {
  age: 25,
  isStudent: false,
  country: "USA",
  city: "London"
};

const start = performance.now();
const gateway: any = processDefinition.elements.find(
  (x: any) => x.name === "gate1"
);
const result = evaluateConditions(inputData, gateway);
const nextTask: any = processDefinition.elements.find(
  (x: any) => x.name === result
);

const end = performance.now();
console.log("Next task:", nextTask);
const elapsed = end - start;
console.log(`Time elapsed: ${elapsed} ms`);
