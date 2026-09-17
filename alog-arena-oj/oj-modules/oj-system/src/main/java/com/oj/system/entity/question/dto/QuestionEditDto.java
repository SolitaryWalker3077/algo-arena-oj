package com.oj.system.entity.question.dto;


import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QuestionEditDto extends QuestionAddDto{

    @NotNull(message = "题目ID不能为空")
    private Long questionId;

}
