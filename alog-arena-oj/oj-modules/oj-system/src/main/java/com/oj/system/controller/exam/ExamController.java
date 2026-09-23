package com.oj.system.controller.exam;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.common.entity.TableDataInfo;
import com.oj.system.entity.exam.dto.ExamAddDto;
import com.oj.system.entity.exam.dto.ExamEditDto;
import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.entity.exam.dto.ExamQuestionAddDto;
import com.oj.system.entity.exam.vo.ExamDetailVO;
import com.oj.system.service.exam.IExamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/exam")
@Tag(name = "竞赛管理接口")
public class ExamController extends BaseController {


    @Autowired
    private IExamService examService;

    //列表:接口地址: /exam/list
    @Operation(summary = "竞赛列表")
    @GetMapping("/list")
    public TableDataInfo list(@Validated ExamQueryDto examQueryDto) {
        return getDataTable(examService.list(examQueryDto));
    }

    //添加竞赛:接口地址:/exam/add
    @Operation(summary = "不包含题目添加竞赛")
    @PostMapping("/add")
    public Result<String> add(@RequestBody ExamAddDto examAddDto) {
        return Result.success(examService.add(examAddDto));
    }

    @Operation(summary = "包含题目添加竞赛")
    @PostMapping("/question/add")
    public Result<Void> questionAdd(@RequestBody ExamQuestionAddDto examQuestionAddDto) {
       return toResult(examService.questionAdd(examQuestionAddDto));
    }

    @Operation(summary = "竞赛题目删除")
    @DeleteMapping("/question/delete")
    public Result<Void> questionDelete(Long examId,Long questionId) {
        return toResult(examService.questionDelete(examId,questionId));
    }

    @Operation(summary = "竞赛详情功能")
    @GetMapping("/detail")
    public Result<ExamDetailVO> detail(Long examId) {
        return Result.success(examService.detail(examId));
    }

    @Operation(summary = "修改竞赛基本信息")
    @PutMapping("/edit")
    public Result<Void> edit(@RequestBody ExamEditDto examEditDto) {
        return toResult(examService.edit(examEditDto));
    }
}
